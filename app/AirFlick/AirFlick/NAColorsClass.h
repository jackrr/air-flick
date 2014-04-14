//
//  NAColorsClass.h
//  airflick
//
//  Created by Nathan Teetor on 4/13/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface NAColorsClass : NSObject {
    NSString *color1;
    NSString *color2;
    NSString *color3;
}

@property (nonatomic,retain) NSString *color1;
@property (nonatomic,retain) NSString *color2;
@property (nonatomic,retain) NSString *color3;

+(NAColorsClass*)getInstance;
-(UIColor*)getColor;

@end
