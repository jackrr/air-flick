//
//  NAMainViewController.m
//  airflick
//
//  Created by Nathan Teetor on 3/28/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NAMainViewController.h"
#import "NACard.h"

@interface NAMainViewController ()

@property (nonatomic) int numRequestsSent;

@property (nonatomic) IBOutlet UIView *subView;

@property NACard *currentCard;

@property (nonatomic) NSString *serverURL;
//@property (nonatomic) NSMutableData *_responseData;

@property (nonatomic, weak) IBOutlet UILabel *sendRequestLabel;

@property (nonatomic, strong) IBOutlet UISwipeGestureRecognizer *swipeRightRecognizer;
@property (nonatomic, strong) IBOutlet UISwipeGestureRecognizer *swipeLeftRecognizer;
@property (nonatomic, strong) IBOutlet UISwipeGestureRecognizer *swipeUpRecognizer;

@end

@implementation NAMainViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    // load self, or whatever
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    
    if (self) {
        self.serverURL = @"http://localhost:3000/device/hello";
        
        [self addCard];
    }
    
    // return the main view
    return self;
}

// request methods (you tell me)

- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response {
    // A response has been received, this is where we initialize the instance var you created
    // so that we can append data to it in the didReceiveData method
    // Furthermore, this method is called each time there is a redirect so reinitializing it
    // also serves to clear it
    _responseData = [[NSMutableData alloc] init];
}

- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data {
    // Append the new data to the instance variable you declared
    [_responseData appendData:data];
}

- (NSCachedURLResponse *)connection:(NSURLConnection *)connection willCacheResponse:(NSCachedURLResponse*)cachedResponse {
    // Return nil to indicate not necessary to store a cached response for this connection
    return nil;
}

- (void)connectionDidFinishLoading:(NSURLConnection *)connection {
    // The request is complete and data has been received
    // You can parse the stuff in your instance variable now
    
//    NSString *msg = [NSString stringWithFormat:@"%@",_responseData];
    //NSDictionary *jsonObj = [NSJSONSerialization JSONObjectWithData:_responseData options:0 error:nil];
    //NSString *msg = [jsonObj valueForKey:@"message"]; //[NSString stringWithFormat:@"%@",jsonObj];
    
    //UIAlertView *receivedData = [[UIAlertView alloc] initWithTitle:@"Data Received" message:msg delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil];
    
    //[receivedData show];
    [self addCard];
    NSLog(@"Card sent succesfully");
}

- (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    // The request has failed for some reason!
    // Check the error var
    
    // throws error aka DOES NOT WORK
    
    NSLog(@"%@",[NSString stringWithFormat:@"Connection failed: %@",error]);
    
    //[[[UIAlertView alloc] initWithTitle:@"Connection Error" message:@"Could not connect to server" delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil] show];
}

- (void)sendJSONtoServer:(NSDictionary *)dict {
    // set URL
    NSURL *url = [NSURL URLWithString:self.serverURL];
    
    // convert NSDictionary to NSData
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:dict options:kNilOptions error:nil];
    
    // construct request
    NSMutableURLRequest *req = [[NSMutableURLRequest alloc] init];
    [req setURL:url];
    [req setHTTPMethod:@"POST"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    [req setHTTPBody:jsonData];
    
    // construct connection
    NSURLConnection *conn = [[NSURLConnection alloc] initWithRequest:req delegate:self];
    
}

- (void)sendCardtoServer:(NSString *)direction {
    NSString *deviceID = [NSString stringWithFormat:@"%@",[[UIDevice currentDevice] identifierForVendor]];
    NSString *cardColor = self.currentCard.typeColor;
    
    [self sendJSONtoServer:[NSDictionary dictionaryWithObjectsAndKeys:
                            deviceID,@"id",
                            cardColor,@"color",
                            direction,@"direction",
                            nil]];
    
}

- (IBAction)swipeRightResponder:(UISwipeGestureRecognizer *)sr {
    NSLog(@"Swipe right detected");
    
//    NSDictionary *dict = [NSDictionary dictionaryWithObjectsAndKeys:@"right", @"direction", nil];
//    [self sendJSONtoServer:dict];
    [self sendCardtoServer:@"right"];
    
   // [self addCard];
}

- (IBAction)swipeLeftResponder:(UISwipeGestureRecognizer *)sr {
    NSLog(@"Swipe left detected");

    [self sendCardtoServer:@"left"];
    
  //  [self addCard];
}

- (IBAction)swipeUpResponder:(UISwipeGestureRecognizer *)sr {
    NSLog(@"Swipe up detected");
    
//    NSDictionary *dict = [NSDictionary dictionaryWithObjectsAndKeys:@"up", @"direction", nil];
//    [self sendJSONtoServer:dict];
    [self sendCardtoServer:@"up"];
    
  //  [self addCard];
}

- (void)addCard {
    NSLog(@"Tap detected");
    
    NACard *newCard = [[NACard alloc] initWithParentView:self.view];
    self.currentCard = newCard;
    [newCard display];
    
    //NSLog(@"%@",[self.view subviews]);
}

@end
