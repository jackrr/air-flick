//
//  NARoomViewController.h
//  airflick
//
//  Created by Nathan Teetor on 4/7/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface NARoomViewController : UIViewController<NSURLConnectionDelegate>
{
    NSMutableData *_responseData;
}

@end
